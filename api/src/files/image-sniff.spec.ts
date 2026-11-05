import { sniffImage } from "./image-sniff";

const bytes = (...b: number[]) => Uint8Array.from(b);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBPVP8 ")]);

describe("sniffImage", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toEqual({ mime: "image/jpeg", ext: "jpg" });
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toEqual({ mime: "image/png", ext: "png" });
    expect(sniffImage(webp)).toEqual({ mime: "image/webp", ext: "webp" });
  });

  it("rejects text, HTML, SVG, GIF, PDF and an empty file", () => {
    for (const text of ["hello world", "<html><script>x</script>", '<svg xmlns="http://www.w3.org/2000/svg"/>', "GIF89a....", "%PDF-1.7 ...."]) {
      expect(sniffImage(Buffer.from(text))).toBeNull();
    }
    expect(sniffImage(new Uint8Array())).toBeNull();
  });

  it("rejects files that are too short to carry a signature", () => {
    expect(sniffImage(bytes(0xff, 0xd8))).toBeNull();
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull();
    expect(sniffImage(Buffer.from("RIFF1234WEB"))).toBeNull();
  });

  it("rejects a RIFF file that is not WebP (for example WAV)", () => {
    expect(sniffImage(Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WAVEfmt ")]))).toBeNull();
  });
});
