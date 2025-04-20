import { BaseDirectory, readFile } from "@tauri-apps/plugin-fs";

export const convertImageToJpg = async (filePath: string) => {
  try {
    const imageData = await readFile(filePath, {
      baseDir: BaseDirectory.AppLocalData,
    });

    const isWebP =
      String.fromCharCode(...imageData.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...imageData.slice(8, 12)) === "WEBP";

    let width: number;
    let height: number;
    let imageToRender: any;

    if (isWebP) {
      const blob = new Blob([imageData], { type: "image/webp" });
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
      imageToRender = img;
      width = img.width;
      height = img.height;
    } else {
      const blob = new Blob([imageData]);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
      imageToRender = img;
      width = img.width;
      height = img.height;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.drawImage(imageToRender, 0, 0);

    if (!String.fromCharCode(...imageData.slice(0, 2)).startsWith("\xFF\xD8")) {
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob(resolve as BlobCallback, "image/jpeg")
      );
      const arrayBuffer = await blob.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } else {
      return imageData;
    }
  } catch (error) {
    throw new Error(`Failed to convert image to JPEG: ${error}`);
  }
};
