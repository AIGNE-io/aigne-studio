export class TextDecoder {
  private hostDecoderId = __blocklet_quickjs_builtin__.textDecoderNew();

  decode(input?: AllowSharedBufferSource, options?: TextDecodeOptions): string {
    return __blocklet_quickjs_builtin__.textDecoderDecode(this.hostDecoderId, input, options);
  }
}
