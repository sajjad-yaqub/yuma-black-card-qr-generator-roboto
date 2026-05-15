
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImagePreview } from './ImagePreview';
import { toast } from 'sonner';
import { Download, FileText, Search } from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import cardFrontImg from '@/assets/card-front.png';
import cardBackImg from '@/assets/card-back.png';
import { supabase } from '@/integrations/supabase/client';

interface ProcessedItem {
  cardId: string;
  qrContent: string;
  filename: string;
  qrCode: string;
  frontImage: string;
  backImage: string;
}

const RANGE_LIMIT = 1000;

export const QRCodeGenerator = () => {
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Single search
  const [singleQuery, setSingleQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Range search
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

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
      width: 800,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
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
        ctx.fillStyle = '#1A1D24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r < 128 && g < 128 && b < 128) {
            const y = Math.floor((i / 4) / canvas.width);
            const gradientRatio = y / canvas.height;
            const startColor = { r: 255, g: 242, b: 147 };
            const endColor = { r: 218, g: 188, b: 91 };
            data[i] = Math.round(startColor.r + (endColor.r - startColor.r) * gradientRatio);
            data[i + 1] = Math.round(startColor.g + (endColor.g - startColor.g) * gradientRatio);
            data[i + 2] = Math.round(startColor.b + (endColor.b - startColor.b) * gradientRatio);
          } else if (r > 200 && g > 200 && b > 200) {
            data[i] = 26;
            data[i + 1] = 29;
            data[i + 2] = 36;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.src = qrDataUrl;
    });
  };

  const overlayOnImage = (
    baseImageSrc: string,
    text: string,
    qrCode?: string,
    isBack: boolean = false
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, img.width, img.height);

        if (isBack && qrCode) {
          const qrImg = new Image();
          qrImg.onload = () => {
            const qrSize = img.width * 0.5;
            const centerX = img.width / 2;
            const centerY = img.height / 2;
            const qrY = centerY - qrSize / 2 - img.height * 0.08;
            ctx.drawImage(qrImg, centerX - qrSize / 2, qrY, qrSize, qrSize);

            const targetTextWidth = img.width * 0.52;
            let fontSize = Math.max(32, img.width * 0.06);
            ctx.font = `50px "Roboto Mono", monospace`;
            const textMetrics = ctx.measureText(text);
            if (textMetrics.width !== 0) {
              fontSize = (fontSize * targetTextWidth) / textMetrics.width;
              fontSize = Math.max(20, fontSize);
            }
            const gradient = ctx.createLinearGradient(0, 0, 0, fontSize);
            gradient.addColorStop(0, '#FFF293');
            gradient.addColorStop(1, '#DABC5B');
            ctx.fillStyle = gradient;
            ctx.font = `50px "Roboto Mono", monospace`;
            ctx.textAlign = 'center';
            (ctx as any).letterSpacing = '3px';
            const textY = qrY + qrSize + fontSize * 1.5;
            ctx.fillText(text, centerX, textY);
            resolve(canvas.toDataURL('image/png', 1.0));
          };
          qrImg.src = qrCode;
        } else {
          const fontSize = Math.max(32, img.width * 0.06);
          const gradient = ctx.createLinearGradient(0, 0, 0, fontSize);
          gradient.addColorStop(0, '#FFF293');
          gradient.addColorStop(1, '#DABC5B');
          ctx.fillStyle = gradient;
          ctx.font = `50px "Roboto Mono", monospace`;
          ctx.textAlign = 'center';
          (ctx as any).letterSpacing = '3px';
          const textY = img.height - (img.height * 0.33);
          ctx.fillText(text, img.width / 2, textY);
          resolve(canvas.toDataURL('image/png', 1.0));
        }
      };
      img.crossOrigin = 'anonymous';
      img.src = baseImageSrc;
    });
  };

  interface CardEntry {
    card_id: string;
    qr_content: string | null;
  }

  const processList = async (entries: CardEntry[]) => {
    if (entries.length === 0) {
      toast.error('No card IDs to process');
      return;
    }
    setIsProcessing(true);
    setProgress(0);
    setProcessedItems([]);
    try {
      const items: ProcessedItem[] = [];
      const batchSize = 5;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (entry) => {
            const cardId = entry.card_id.trim();
            const qrText = (entry.qr_content ?? cardId).trim();
            if (!cardId) return null;
            const filename = generateFilename(cardId);
            try {
              const qrDataUrl = await generateQRCode(qrText);
              const gradientQR = await createGradientQR(qrDataUrl);
              const frontImageData = await overlayOnImage(cardFrontImg, filename, undefined, false);
              const backImageData = await overlayOnImage(cardBackImg, filename, gradientQR, true);
              return { cardId, qrContent: qrText, filename, qrCode: gradientQR, frontImage: frontImageData, backImage: backImageData };
            } catch (e) {
              console.error('Error processing', cardId, e);
              return null;
            }
          })
        );
        items.push(...(batchResults.filter(Boolean) as ProcessedItem[]));
        setProgress(((i + batch.length) / entries.length) * 100);
        if (i + batchSize < entries.length) {
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      setProcessedItems(items);
      const failed = entries.length - items.length;
      if (failed > 0) toast.warning(`Processed ${items.length}/${entries.length} (${failed} failed)`);
      else toast.success(`Generated ${items.length} card${items.length === 1 ? '' : 's'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSingleSearch = async () => {
    const q = singleQuery.trim();
    if (!q) {
      toast.error('Enter a card ID');
      return;
    }
    setIsSearching(true);
    try {
      // Try exact match first, then suffix match (last 11 chars convention)
      const { data: exact, error: e1 } = await supabase
        .from('card_ids')
        .select('card_id, qr_content')
        .eq('card_id', q)
        .maybeSingle();
      if (e1) throw e1;
      let match = exact;
      if (!match) {
        const { data: like, error: e2 } = await supabase
          .from('card_ids')
          .select('card_id, qr_content')
          .ilike('card_id', `%${q}`)
          .limit(1);
        if (e2) throw e2;
        match = like?.[0] ?? null;
      }
      if (!match) {
        toast.error('No card found with that ID');
        return;
      }
      await processList([{ card_id: match.card_id, qr_content: match.qr_content }]);
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRangeSearch = async () => {
    const from = rangeFrom.trim();
    const to = rangeTo.trim();
    if (!from || !to) {
      toast.error('Enter both From and To values');
      return;
    }
    if (!/^\d+$/.test(from) || !/^\d+$/.test(to)) {
      toast.error('Range values must be numeric');
      return;
    }
    const fromNum = from;
    const toNum = to;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('card_ids')
        .select('card_id, card_id_numeric, qr_content')
        .gte('card_id_numeric', fromNum)
        .lte('card_id_numeric', toNum)
        .order('card_id_numeric', { ascending: true })
        .limit(RANGE_LIMIT + 1);
      if (error) throw error;
      const entries = (data ?? []).map((r) => ({ card_id: r.card_id as string, qr_content: r.qr_content as string | null }));
      if (entries.length === 0) {
        toast.error('No cards in that range');
        return;
      }
      if (entries.length > RANGE_LIMIT) {
        toast.warning(`Range exceeds ${RANGE_LIMIT}; processing first ${RANGE_LIMIT}`);
        entries.length = RANGE_LIMIT;
      }
      await processList(entries);
    } catch (err) {
      console.error(err);
      toast.error('Range query failed');
    } finally {
      setIsSearching(false);
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
    const usedFolderNames = new Set<string>();
    processedItems.forEach((item) => {
      let folderName = item.filename;
      let counter = 1;
      while (usedFolderNames.has(folderName)) {
        folderName = `${item.filename}_${String(counter).padStart(3, '0')}`;
        counter++;
      }
      usedFolderNames.add(folderName);
      const cardFolder = masterFolder!.folder(folderName);
      const frontData = item.frontImage.split(',')[1];
      cardFolder!.file(`${folderName}_front.png`, frontData, { base64: true });
      const backData = item.backImage.split(',')[1];
      cardFolder!.file(`${folderName}_back.png`, backData, { base64: true });
    });
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'qr_code_images.zip');
      toast.success('PNG ZIP downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Error creating ZIP');
    }
  };

  const downloadAllPDFsAsZip = async () => {
    if (processedItems.length === 0) return;
    const zip = new JSZip();
    const masterFolder = zip.folder('QR_Code_Cards_PDF');
    const batchSize = 10;
    try {
      for (let i = 0; i < processedItems.length; i += batchSize) {
        const batch = processedItems.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (item) => {
            const cardFolder = masterFolder!.folder(item.filename);
            try {
              const frontPdf = new jsPDF();
              frontPdf.addImage(item.frontImage, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
              cardFolder!.file(`${item.filename}_front.pdf`, frontPdf.output('blob'));
            } catch (e) { console.error('front pdf', e); }
            try {
              const backPdf = new jsPDF();
              backPdf.addImage(item.backImage, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
              cardFolder!.file(`${item.filename}_back.pdf`, backPdf.output('blob'));
            } catch (e) { console.error('back pdf', e); }
          })
        );
        if (i + batchSize < processedItems.length) {
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      saveAs(content, 'qr_code_pdfs.zip');
      toast.success('PDF ZIP downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Error creating PDF ZIP');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
            Yuma Gold Card Generator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Search a single card ID or a range to generate front and back images.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find Cards</CardTitle>
            <CardDescription>Search a single card by ID or fetch a numeric range.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="single">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single ID</TabsTrigger>
                <TabsTrigger value="range">Range</TabsTrigger>
              </TabsList>
              <TabsContent value="single" className="space-y-3 pt-4">
                <Label htmlFor="single">Card ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="single"
                    placeholder="Enter full card ID"
                    value={singleQuery}
                    onChange={(e) => setSingleQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSingleSearch(); }}
                  />
                  <Button
                    onClick={handleSingleSearch}
                    disabled={isSearching || isProcessing}
                    className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="range" className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="from">From (numeric)</Label>
                    <Input
                      id="from"
                      placeholder="e.g. 10000000000"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to">To (numeric)</Label>
                    <Input
                      id="to"
                      placeholder="e.g. 10000000100"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleRangeSearch}
                  disabled={isSearching || isProcessing}
                  className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
                >
                  <Search className="w-4 h-4" />
                  Fetch & Generate Range
                </Button>
                <p className="text-xs text-muted-foreground">
                  Up to {RANGE_LIMIT} cards per range.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

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

        {processedItems.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <CardTitle>Generated Images</CardTitle>
                  <CardDescription>{processedItems.length} image pair{processedItems.length === 1 ? '' : 's'} generated</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={downloadAllAsZip} variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download PNG ZIP
                  </Button>
                  <Button onClick={downloadAllPDFsAsZip} variant="outline" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Download PDF ZIP
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ImagePreview items={processedItems} onDownloadImage={downloadImage} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
