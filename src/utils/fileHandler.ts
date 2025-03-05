export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export class FileHandler {
  private static readonly ALLOWED_TYPES = [
    // Original types
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/javascript',
    'text/typescript',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-cpp',
    'text/x-csharp',
    'text/x-go',
    'text/x-rust',
    'text/x-sql',
    'text/x-yaml',
    'text/x-json',
    'text/x-latex',
    'text/html',
    'text/css',
    'text/xml',
    'text/x-php',
    'text/x-ruby',
    'text/x-swift',
    'text/x-kotlin',
    'text/x-scala',
    'text/x-perl',
    'text/x-r',
    'text/x-matlab',
    'text/x-lua',
    'text/x-shell',
    'text/x-dockerfile',
    'text/x-properties',
    'text/x-ini',
    'text/x-toml',

    // Additional Programming Languages
    'text/x-dart',
    'text/x-elm',
    'text/x-erlang',
    'text/x-groovy',
    'text/x-haskell',
    'text/x-julia',
    'text/x-lisp',
    'text/x-nim',
    'text/x-objective-c',
    'text/x-ocaml',
    'text/x-powershell',
    'text/x-racket',
    'text/x-reason',
    'text/x-scheme',
    'text/x-solidity',
    'text/x-vb',
    'text/x-verilog',
    'text/x-vhdl',

    // Configuration and Markup Languages
    'text/x-graphql',
    'text/x-protobuf',
    'text/x-rst',
    'text/x-asciidoc',
    'text/x-tex',
    'text/x-textile',
    'text/x-mediawiki',
    'text/x-org',

    // Build and Dependency Files
    'text/x-npm-config',
    'text/x-gradle',
    'text/x-maven-pom',
    'text/x-bazel',

    // Environment and System Files
    'text/x-env',
    'text/x-gitignore',
    'text/x-editorconfig',

    // Data Serialization Formats
    'text/x-jsonld',
    'text/x-hjson',
    'text/x-tml',
    'text/x-ron',

    // Log and Documentation
    'text/x-log',
    'text/x-changelog',
    'text/x-readme'
  ];
  private static readonly MAX_SIZE = 150 * 1024 * 1024; // 150MB

  static validateFile(file: File): FileValidationResult {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only .txt, .md, and .csv files are allowed.'
      };
    }

    if (file.size > this.MAX_SIZE) {
      return {
        isValid: false,
        error: 'File size exceeds 150MB limit.'
      };
    }

    return { isValid: true };
  }

  static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          // Sanitize the content to prevent XSS
          const content = this.sanitizeContent(event.target.result as string);
          resolve(content);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private static sanitizeContent(content: string): string {
    // Basic XSS prevention by escaping HTML tags
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}