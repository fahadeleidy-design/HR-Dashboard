import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Download, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface FilePreviewProps {
  filePath: string;
  fileName: string;
  onClose: () => void;
}

export default function FilePreview({ filePath, fileName, onClose }: FilePreviewProps) {
  const { language } = useLanguage();
  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const { logError } = useErrorHandler();

  useEffect(() => {
    loadFile();

    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [filePath]);

  const loadFile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('training-materials')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setFileUrl(url);
    } catch (error) {
      logError(error, 'medium', { component: 'FilePreview', action: 'loadFile' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('training-materials')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logError(error, 'medium', { component: 'FilePreview', action: 'downloadFile' });
    }
  };

  const getFileExtension = (path: string) => {
    return path.split('.').pop()?.toLowerCase() || '';
  };

  const renderPreview = () => {
    const ext = getFileExtension(filePath);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return (
        <div className="flex items-center justify-center h-full overflow-auto bg-gray-50">
          <img
            src={fileUrl}
            alt={fileName}
            style={{ transform: `scale(${zoom / 100})` }}
            className="max-w-full max-h-full object-contain transition-transform"
          />
        </div>
      );
    }

    if (['mp4', 'webm', 'ogg'].includes(ext)) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-full"
            style={{ width: `${zoom}%` }}
          >
            {language === 'ar' ? 'متصفحك لا يدعم تشغيل الفيديو' : 'Your browser does not support video playback'}
          </video>
        </div>
      );
    }

    if (ext === 'pdf') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          title={fileName}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-center">
          <p className="text-gray-600 mb-2">
            {language === 'ar'
              ? 'لا يمكن معاينة هذا النوع من الملفات'
              : 'Preview not available for this file type'}
          </p>
          <p className="text-sm text-gray-500">
            {language === 'ar' ? 'انقر على تحميل لعرض الملف' : 'Click download to view the file'}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
          {language === 'ar' ? 'تحميل الملف' : 'Download File'}
        </button>
      </div>
    );
  };

  const canZoom = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm'].includes(
    getFileExtension(filePath)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
          {fileName}
        </h3>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {canZoom && (
            <>
              <button
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                disabled={zoom <= 25}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                title={language === 'ar' ? 'تصغير' : 'Zoom Out'}
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600 min-w-[4rem] text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                title={language === 'ar' ? 'تكبير' : 'Zoom In'}
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </>
          )}

          <button
            onClick={handleDownload}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title={language === 'ar' ? 'تحميل' : 'Download'}
          >
            <Download className="h-5 w-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title={language === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderPreview()}
      </div>
    </div>
  );
}
