self.__uv$config = {
  prefix: '/service/',
  bare: '/bare/',
  encodeUrl: (input) => {
    if (typeof Ultraviolet !== 'undefined' && Ultraviolet.codec?.xor?.encode) {
      return Ultraviolet.codec.xor.encode(input);
    }
    return encodeURIComponent(input);
  },
  decodeUrl: (input) => {
    if (typeof Ultraviolet !== 'undefined' && Ultraviolet.codec?.xor?.decode) {
      return Ultraviolet.codec.xor.decode(input);
    }
    try {
      return decodeURIComponent(input);
    } catch {
      return input;
    }
  },
  handler: '/uv/uv.handler.js',
  bundle: '/uv/uv.bundle.js',
  config: '/uv/uv.config.js',
  sw: '/uv/uv.sw.js',
};
