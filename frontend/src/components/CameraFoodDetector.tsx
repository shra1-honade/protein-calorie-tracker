import { useState, useRef } from 'react';
import { Camera, Upload, Loader } from 'lucide-react';
import api from '../api';

interface DetectedFood {
  name: string;
  protein_g: number;
  calories: number;
  confidence: number;
}

interface Props {
  onDetect: (foods: DetectedFood[], totalProtein: number, totalCalories: number) => void;
}

export default function CameraFoodDetector({ onDetect }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    // Set capturing to true FIRST so video element renders
    setCapturing(true);
    setStartingCamera(true);

    // Wait a tick for the video element to be in the DOM
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Try to play immediately
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // If immediate play fails, wait for metadata
          await new Promise((resolve) => {
            videoRef.current!.onloadedmetadata = resolve;
          });
          await videoRef.current.play();
        }

        setStartingCamera(false);
      } else {
        alert('Failed to initialize camera. Try again.');
        setCapturing(false);
        setStartingCamera(false);
      }
    } catch (err) {
      alert('Camera access denied. Use file upload instead.');
      setCapturing(false);
      setStartingCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) analyzeImage(blob);
    }, 'image/jpeg', 0.8);
    stopCamera();
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setCapturing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeImage(file);
    }
  };

  const analyzeImage = async (image: Blob) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', image);
      const { data } = await api.post<{
        foods: DetectedFood[];
        total_protein: number;
        total_calories: number;
      }>('/food/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onDetect(data.foods, data.total_protein, data.total_calories);
    } catch {
      alert('Failed to analyze image. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="card flex flex-col items-center gap-4 py-12">
        <Loader size={40} className="animate-spin text-primary-600" />
        <p className="text-gray-600">Analyzing your food...</p>
      </div>
    );
  }

  if (capturing) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-black"
            style={{ minHeight: '300px', maxHeight: '500px' }}
          />
          {startingCamera && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg">
              <Loader size={40} className="animate-spin text-white" />
              <p className="text-white mt-4">Starting camera...</p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={capturePhoto} className="btn-primary flex-1" disabled={startingCamera}>
            Capture Photo
          </button>
          <button onClick={stopCamera} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <Camera size={48} className="text-gray-300" />
        <p className="text-gray-600">Take a photo of your food</p>
        <button onClick={startCamera} className="btn-primary flex items-center gap-2">
          <Camera size={18} />
          Open Camera
        </button>
      </div>

      <div className="flex items-center gap-3 text-gray-300">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <Upload size={18} />
        Upload Photo
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
