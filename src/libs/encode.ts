import encoder from '@beskar-labs/gpt-encoder';

const encode: typeof encoder = typeof encoder === 'function' ? encoder : (encoder as any).default;

export default encode;
