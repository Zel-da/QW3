import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface PdfViewerProps {
  documentUrl: string;
  title: string;
}

export function PdfViewer({ documentUrl, title }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto" data-testid="pdf-viewer">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center korean-text" data-testid="pdf-title">
          <FileText className="w-5 h-5 mr-2" />
          {title}
        </CardTitle>
        <Button 
          onClick={handleDownload}
          variant="outline"
          size="sm"
          className="korean-text"
          data-testid="button-download-pdf"
        >
          <Download className="w-4 h-4 mr-2" />
          PDF 다운로드
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-96 border border-border rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center korean-text">
                <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">문서를 불러오는 중...</p>
              </div>
            </div>
          )}
          <iframe
            src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full"
            title={title}
            onLoad={() => setIsLoading(false)}
            data-testid="pdf-iframe"
          />
        </div>
        <div className="mt-4 text-xs text-muted-foreground text-center korean-text">
          PDF 문서가 표시되지 않으면 다운로드 버튼을 클릭하여 파일을 직접 다운로드하세요.
        </div>
      </CardContent>
    </Card>
  );
}
