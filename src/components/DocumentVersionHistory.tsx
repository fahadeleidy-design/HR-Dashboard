import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Download, Eye, RotateCcw, FileText, User } from 'lucide-react';

interface Version {
  id: string;
  version_number: number;
  file_url: string;
  file_size: number;
  changes_summary: string;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    email: string;
  };
}

interface DocumentVersionHistoryProps {
  documentId: string;
  onRestore?: (versionId: string) => void;
}

export function DocumentVersionHistory({ documentId, onRestore }: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, [documentId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
          *,
          uploader:uploaded_by(email)
        `)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (data && !error) {
        setVersions(data);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-bold text-gray-900">Version History</h3>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </span>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No version history available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                index === 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      v{version.version_number}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Current
                      </span>
                    )}
                    <span className="text-sm text-gray-600">
                      {formatFileSize(version.file_size)}
                    </span>
                  </div>

                  {version.changes_summary && (
                    <p className="text-sm text-gray-700 mb-2">{version.changes_summary}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{version.uploader?.email || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(version.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <a
                    href={version.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
                    title="View"
                  >
                    <Eye className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                  </a>
                  <a
                    href={version.file_url}
                    download
                    className="p-2 hover:bg-green-100 rounded-lg transition-colors group"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-gray-600 group-hover:text-green-600" />
                  </a>
                  {index !== 0 && onRestore && (
                    <button
                      onClick={() => onRestore(version.id)}
                      className="p-2 hover:bg-purple-100 rounded-lg transition-colors group"
                      title="Restore this version"
                    >
                      <RotateCcw className="h-4 w-4 text-gray-600 group-hover:text-purple-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Version history allows you to track changes, download previous versions,
          and restore older versions if needed. Each upload creates a new version automatically.
        </p>
      </div>
    </div>
  );
}
