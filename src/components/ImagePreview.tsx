
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileImage, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

interface ProcessedItem {
  cardId: string;
  qrContent: string;
  filename: string;
  qrCode: string;
  frontImage: string;
  backImage: string;
}

interface ImagePreviewProps {
  items: ProcessedItem[];
  onDownloadImage: (dataUrl: string, filename: string, type: 'front' | 'back') => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ items, onDownloadImage }) => {
  const downloadPDF = (dataUrl: string, filename: string, type: 'front' | 'back') => {
    const pdf = new jsPDF();
    const img = new Image();
    
    img.onload = () => {
      // Calculate dimensions to fit PDF page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgAspectRatio = img.width / img.height;
      const pdfAspectRatio = pdfWidth / pdfHeight;
      
      let finalWidth, finalHeight;
      if (imgAspectRatio > pdfAspectRatio) {
        finalWidth = pdfWidth;
        finalHeight = pdfWidth / imgAspectRatio;
      } else {
        finalHeight = pdfHeight;
        finalWidth = pdfHeight * imgAspectRatio;
      }
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save(`${filename}_${type}.pdf`);
    };
    
    img.src = dataUrl;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="text-center">
              <h3 className="font-share-tech text-sm text-amber-600 mb-2">
                {item.filename}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {item.cardId}
              </p>
            </div>
            
            {/* Front Image Preview */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Front</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadImage(item.frontImage, item.filename, 'front')}
                    className="gap-1"
                  >
                    <FileImage className="w-3 h-3" />
                    PNG
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPDF(item.frontImage, item.filename, 'front')}
                    className="gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    PDF
                  </Button>
                </div>
              </div>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={item.frontImage}
                  alt={`Front - ${item.filename}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Back Image Preview */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Back</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadImage(item.backImage, item.filename, 'back')}
                    className="gap-1"
                  >
                    <FileImage className="w-3 h-3" />
                    PNG
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPDF(item.backImage, item.filename, 'back')}
                    className="gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    PDF
                  </Button>
                </div>
              </div>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={item.backImage}
                  alt={`Back - ${item.filename}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
