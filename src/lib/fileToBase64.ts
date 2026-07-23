export interface EncodedFile {
  name: string;
  mimeType: string;
  dataBase64: string;
}

// แปลง File เป็น base64 (ตัด data URL prefix ออก) ให้ backend decode ด้วย Utilities.base64Decode
export function fileToBase64(file: File): Promise<EncodedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64: result.split(',')[1],
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
