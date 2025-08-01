
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileUpload } from './FileUpload';
import { ImagePreview } from './ImagePreview';
import { CSVEditor } from './CSVEditor';
import { toast } from 'sonner';
import { Download, FileImage, FileText } from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

interface ProcessedItem {
  text: string;
  filename: string;
  qrCode: string;
  frontImage: string;
  backImage: string;
}

export const QRCodeGenerator = () => {
  const [csvData, setCsvData] = useState<string[]>([]);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateFilename = (text: string): string => {
    const cleanText = text.trim();
    if (cleanText.length >= 11) {
      return cleanText.slice(-11);
    } else {
      const padding = 'x'.repeat(11 - cleanText.length);
      return cleanText + padding;
    }
  };

  const generateQRCode = async (text: string): Promise<string> => {
    return await QRCode.toDataURL(text, {
      width: 800, // Increased from 400 for higher quality
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'  // Use white background for proper QR code generation
      },
      errorCorrectionLevel: 'M'
    });
  };

  const createGradientQR = (qrDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Fill canvas with dark background color first
        ctx.fillStyle = '#1A1D24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the QR code
        ctx.drawImage(img, 0, 0);
        
        // Get image data to identify QR code pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply gradient only to dark pixels (QR code modules) and set background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // If pixel is dark (QR code module), apply gradient
          if (r < 128 && g < 128 && b < 128) {
            const y = Math.floor((i / 4) / canvas.width);
            const gradientRatio = y / canvas.height;
            
            // Interpolate between gradient colors #FFF293 to #DABC5B
            const startColor = { r: 255, g: 242, b: 147 }; // #FFF293
            const endColor = { r: 218, g: 188, b: 91 };   // #DABC5B
            
            data[i] = Math.round(startColor.r + (endColor.r - startColor.r) * gradientRatio);
            data[i + 1] = Math.round(startColor.g + (endColor.g - startColor.g) * gradientRatio);
            data[i + 2] = Math.round(startColor.b + (endColor.b - startColor.b) * gradientRatio);
          } else if (r > 200 && g > 200 && b > 200) {
            // If pixel is light (background), set to dark background color
            data[i] = 26;     // #1A1D24 RGB values
            data[i + 1] = 29;
            data[i + 2] = 36;
          }
        }
        
        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0);
        
        resolve(canvas.toDataURL('image/png', 1.0)); // Maximum quality PNG
      };
      
      img.src = qrDataUrl;
    });
  };

  const overlayOnImage = (
    baseImage: File,
    text: string,
    qrCode?: string,
    isBack: boolean = false
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Scale up canvas for higher quality
        const scale = 2; // 2x resolution for crisp images
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Scale the context to ensure crisp rendering
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw base image
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        if (isBack && qrCode) {
          // Back image: QR code and text with specific sizing
          const qrImg = new Image();
          qrImg.onload = () => {
            // QR code should cover 50% of the width (reduced from 62.5% by 20%)
            const qrSize = img.width * 0.5;
            const centerX = img.width / 2;
            const centerY = img.height / 2;
            
            // Draw QR code centered, slightly above center
            const qrY = centerY - qrSize / 2 - img.height * 0.08; // 8% above center
            ctx.drawImage(qrImg, centerX - qrSize / 2, qrY, qrSize, qrSize);
            
            // Filename should cover 52% of the width (reduced from 65% by 20%)
            const targetTextWidth = img.width * 0.52;
            let fontSize = Math.max(32, img.width * 0.06); // Start with 6% of canvas width, minimum 32px
            
            // Measure text and adjust font size to achieve 52% width coverage
            ctx.font = `50px "Roboto Mono", monospace`;
            let textMetrics = ctx.measureText(text);
            
            // Adjust font size to match target width
            if (textMetrics.width !== 0) {
              fontSize = (fontSize * targetTextWidth) / textMetrics.width;
              fontSize = Math.max(20, fontSize); // Minimum font size for readability
            }
            
            // Create gradient for text
            const gradient = ctx.createLinearGradient(0, 0, 0, fontSize);
            gradient.addColorStop(0, '#FFF293');
            gradient.addColorStop(1, '#DABC5B');
            
            ctx.fillStyle = gradient;
            ctx.font = `50px "Roboto Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.letterSpacing = '3px';
            
            // Draw text below QR code
            const textY = qrY + qrSize + fontSize * 1.5;
            ctx.fillText(text, centerX, textY);
            
            resolve(canvas.toDataURL('image/png', 1.0)); // Maximum quality PNG
          };
          qrImg.src = qrCode;
        } else {
          // Front image: text only at 33% from bottom
          const fontSize = Math.max(32, img.width * 0.06); // 6% of canvas width, minimum 32px
          
          // Create gradient for text
          const gradient = ctx.createLinearGradient(0, 0, 0, fontSize);
          gradient.addColorStop(0, '#FFF293');
          gradient.addColorStop(1, '#DABC5B');
          
          ctx.fillStyle = gradient;
          ctx.font = `50px "Roboto Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.letterSpacing = '3px';
          
          // Position text 33% from bottom
          const textY = img.height - (img.height * 0.33);
          ctx.fillText(text, img.width / 2, textY);
          
          resolve(canvas.toDataURL('image/png', 1.0)); // Maximum quality PNG
        }
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(baseImage);
    });
  };

  const processFiles = async () => {
    const dataToProcess = csvData.length > 0 ? csvData : [];
    
    if (dataToProcess.length === 0) {
      toast.error('Please add some data to process');
      return;
    }
    
    if (!frontImage || !backImage) {
      toast.error('Please upload front and back images');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const items: ProcessedItem[] = [];
      
      for (let i = 0; i < dataToProcess.length; i++) {
        const text = dataToProcess[i].trim();
        if (!text) continue;

        const filename = generateFilename(text);
        
        // Generate QR code
        const qrDataUrl = await generateQRCode(text);
        const gradientQR = await createGradientQR(qrDataUrl);
        
        // Create front and back images
        const frontImageData = await overlayOnImage(frontImage, filename, undefined, false);
        const backImageData = await overlayOnImage(backImage, filename, gradientQR, true);
        
        items.push({
          text,
          filename,
          qrCode: gradientQR,
          frontImage: frontImageData,
          backImage: backImageData
        });

        setProgress(((i + 1) / dataToProcess.length) * 100);
      }

      setProcessedItems(items);
      toast.success(`Successfully processed ${items.length} items`);
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Error processing files. Please check your inputs.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (dataUrl: string, filename: string, type: 'front' | 'back') => {
    const link = document.createElement('a');
    link.download = `${filename}_${type}.png`;
    link.href = dataUrl;
    link.click();
  };

  const downloadAllAsZip = async () => {
    if (processedItems.length === 0) return;

    const zip = new JSZip();
    const masterFolder = zip.folder('QR_Code_Cards');
    
    processedItems.forEach((item) => {
      // Create individual folder for each card
      const cardFolder = masterFolder!.folder(item.filename);
      
      // Add front image to card folder
      const frontData = item.frontImage.split(',')[1];
      cardFolder!.file(`${item.filename}_front.png`, frontData, { base64: true });
      
      // Add back image to card folder
      const backData = item.backImage.split(',')[1];
      cardFolder!.file(`${item.filename}_back.png`, backData, { base64: true });
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'qr_code_images.zip');
      toast.success('PNG ZIP file downloaded successfully');
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast.error('Error creating ZIP file');
    }
  };

  const downloadAllPDFsAsZip = async () => {
    if (processedItems.length === 0) return;

    const zip = new JSZip();
    const masterFolder = zip.folder('QR_Code_Cards_PDF');
    
    for (const item of processedItems) {
      // Create individual folder for each card
      const cardFolder = masterFolder!.folder(item.filename);
      
      // Generate PDF for front image
      const frontPdf = new jsPDF();
      const frontImg = new Image();
      
      await new Promise<void>((resolve) => {
        frontImg.onload = () => {
          const pdfWidth = frontPdf.internal.pageSize.getWidth();
          const pdfHeight = frontPdf.internal.pageSize.getHeight();
          const imgAspectRatio = frontImg.width / frontImg.height;
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
          
          frontPdf.addImage(item.frontImage, 'PNG', x, y, finalWidth, finalHeight);
          const frontPdfBlob = frontPdf.output('blob');
          cardFolder!.file(`${item.filename}_front.pdf`, frontPdfBlob);
          resolve();
        };
        frontImg.src = item.frontImage;
      });

      // Generate PDF for back image
      const backPdf = new jsPDF();
      const backImg = new Image();
      
      await new Promise<void>((resolve) => {
        backImg.onload = () => {
          const pdfWidth = backPdf.internal.pageSize.getWidth();
          const pdfHeight = backPdf.internal.pageSize.getHeight();
          const imgAspectRatio = backImg.width / backImg.height;
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
          
          backPdf.addImage(item.backImage, 'PNG', x, y, finalWidth, finalHeight);
          const backPdfBlob = backPdf.output('blob');
          cardFolder!.file(`${item.filename}_back.pdf`, backPdfBlob);
          resolve();
        };
        backImg.src = item.backImage;
      });
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'qr_code_pdfs.zip');
      toast.success('PDF ZIP file downloaded successfully');
    } catch (error) {
      console.error('Error creating PDF ZIP:', error);
      toast.error('Error creating PDF ZIP file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
            QR Code Generator & Image Overlay
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your CSV file and images to generate customized QR codes with beautiful overlays
          </p>
        </div>

        {/* CSV Data Editor Section */}
        <CSVEditor onDataChange={setCsvData} initialData={csvData} />

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="w-5 h-5" />
                Front Image
              </CardTitle>
              <CardDescription>
                Background for filename only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                accept=".png,.jpg,.jpeg"
                onFileSelect={setFrontImage}
                selectedFile={frontImage}
                placeholder="Upload front image"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="w-5 h-5" />
                Back Image
              </CardTitle>
              <CardDescription>
                Background for QR code + filename
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                accept=".png,.jpg,.jpeg"
                onFileSelect={setBackImage}
                selectedFile={backImage}
                placeholder="Upload back image"
              />
            </CardContent>
          </Card>
        </div>

        {/* Process Button */}
        <div className="text-center">
          <Button
            onClick={processFiles}
            disabled={csvData.length === 0 || !frontImage || !backImage || isProcessing}
            size="lg"
            className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
          >
            {isProcessing ? 'Processing...' : 'Generate QR Codes'}
          </Button>
        </div>

        {/* Progress */}
        {isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {processedItems.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Generated Images</CardTitle>
                  <CardDescription>
                    {processedItems.length} image pairs generated
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={downloadAllAsZip}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PNG ZIP
                  </Button>
                  <Button
                    onClick={downloadAllPDFsAsZip}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF ZIP
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ImagePreview
                items={processedItems}
                onDownloadImage={downloadImage}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
