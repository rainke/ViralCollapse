export function getSherpaModelFiles(files: string[]): string[] {
  if (files.length === 0) throw new Error('离线语音模型未安装')
  return files
}
