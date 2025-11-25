import { ReactNode, useRef, useEffect, useState } from 'react';

interface ScrollableTableProps {
  children: ReactNode;
  maxHeight?: string;
  stickyScrollbar?: boolean;
}

export function ScrollableTable({ children, maxHeight = '600px', stickyScrollbar = true }: ScrollableTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const scrollbar = scrollbarRef.current;

    if (!tableContainer || !scrollbar) return;

    const syncScrollPosition = () => {
      if (tableContainer && scrollbar) {
        scrollbar.scrollLeft = tableContainer.scrollLeft;
      }
    };

    const syncFromScrollbar = () => {
      if (tableContainer && scrollbar) {
        tableContainer.scrollLeft = scrollbar.scrollLeft;
      }
    };

    const updateScrollbarWidth = () => {
      if (tableContainer) {
        const hasHorizontalScroll = tableContainer.scrollWidth > tableContainer.clientWidth;
        setScrollbarWidth(tableContainer.scrollWidth);
        setShowScrollHint(hasHorizontalScroll && tableContainer.scrollLeft === 0);
      }
    };

    updateScrollbarWidth();
    tableContainer.addEventListener('scroll', syncScrollPosition);
    tableContainer.addEventListener('scroll', updateScrollbarWidth);
    scrollbar.addEventListener('scroll', syncFromScrollbar);
    window.addEventListener('resize', updateScrollbarWidth);

    return () => {
      tableContainer.removeEventListener('scroll', syncScrollPosition);
      tableContainer.removeEventListener('scroll', updateScrollbarWidth);
      scrollbar.removeEventListener('scroll', syncFromScrollbar);
      window.removeEventListener('resize', updateScrollbarWidth);
    };
  }, [children]);

  return (
    <div className="relative">
      {showScrollHint && (
        <div className="absolute top-4 right-4 z-20 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium">Scroll horizontally</span>
        </div>
      )}

      <style>{`
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: #3B82F6 #E5E7EB;
        }

        .scrollbar-custom::-webkit-scrollbar {
          height: 14px;
          width: 14px;
        }

        .scrollbar-custom::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 8px;
          margin: 4px;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%);
          border-radius: 8px;
          border: 3px solid #F3F4F6;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
        }

        .scrollbar-custom::-webkit-scrollbar-corner {
          background: #F3F4F6;
        }

        .sticky-scrollbar {
          position: sticky;
          bottom: 0;
          z-index: 10;
          background: white;
          border-top: 2px solid #E5E7EB;
          padding: 8px 0;
        }
      `}</style>

      <div
        ref={tableContainerRef}
        className="overflow-x-auto overflow-y-auto scrollbar-custom rounded-lg"
        style={{
          maxHeight,
          position: 'relative'
        }}
      >
        <div className="inline-block min-w-full align-middle">
          {children}
        </div>
      </div>

      {stickyScrollbar && scrollbarWidth > 0 && (
        <div className="sticky-scrollbar">
          <div
            ref={scrollbarRef}
            className="overflow-x-auto scrollbar-custom"
            style={{ height: '20px' }}
          >
            <div style={{ width: scrollbarWidth, height: '1px' }} />
          </div>
          <div className="text-center mt-1">
            <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Scroll horizontally using the bar above</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
