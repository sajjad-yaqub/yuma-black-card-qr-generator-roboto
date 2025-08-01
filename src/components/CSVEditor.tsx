
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface CSVEditorProps {
  onDataChange: (data: string[]) => void;
  initialData?: string[];
}

export const CSVEditor: React.FC<CSVEditorProps> = ({ onDataChange, initialData = [] }) => {
  const [items, setItems] = useState<string[]>(initialData);
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      const updatedItems = [...items, newItem.trim()];
      setItems(updatedItems);
      onDataChange(updatedItems);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    onDataChange(updatedItems);
  };

  const updateItem = (index: number, value: string) => {
    const updatedItems = [...items];
    updatedItems[index] = value;
    setItems(updatedItems);
    onDataChange(updatedItems);
  };

  const handleBulkEdit = (value: string) => {
    const lines = value.split('\n').filter(line => line.trim());
    setItems(lines);
    onDataChange(lines);
  };

  const exportToCSV = () => {
    const csvContent = items.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const importFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        setItems(lines);
        onDataChange(lines);
        toast.success(`Imported ${lines.length} items`);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>CSV Data Editor</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={items.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('csv-import')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Add, edit, or remove items for QR code generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          id="csv-import"
          type="file"
          accept=".csv,.txt"
          onChange={importFromFile}
          className="hidden"
        />
        
        {/* Add new item */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter new item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
          />
          <Button onClick={addItem} disabled={!newItem.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Individual items */}
        {items.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Bulk edit */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Bulk Edit (one item per line):</label>
          <Textarea
            placeholder="Enter items, one per line..."
            value={items.join('\n')}
            onChange={(e) => handleBulkEdit(e.target.value)}
            rows={6}
          />
        </div>

        <div className="text-sm text-muted-foreground">
          Total items: {items.length}
        </div>
      </CardContent>
    </Card>
  );
};
