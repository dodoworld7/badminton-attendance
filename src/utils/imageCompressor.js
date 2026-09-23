// 이미지 압축 및 리사이징 유틸리티
// 고해상도 모바일/PC 사진(3MB~15MB)을 브라우저 로컬 저장 및 웹/모바일 전송에 최적화(70KB~100KB 내외)로 리사이징
export const compressImage = (file, maxWidth = 960, quality = 0.78) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('이미지 파일만 등록할 수 있습니다.'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 가로가 maxWidth보다 클 경우 비율 유지하며 축소
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(event.target.result); // 폴백
        }

        // 부드러운 이미지 리샘플링
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG 형식으로 고효율 압축
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
