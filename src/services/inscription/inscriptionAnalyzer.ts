
/**
 * Analyzes files to determine if they should be stored as Solana Inscriptions
 */
export class InscriptionAnalyzer {
  /**
   * Determines if a file should be stored on-chain via Solana Inscriptions
   */
  static shouldUseInscription(file: File): boolean {
    // Critical document types that benefit from on-chain storage
    const criticalTypes = [
      'application/pdf',
      'text/plain',
      'application/json',
      'text/csv',
      'application/xml',
      'text/xml'
    ];
    
    // Small files under 10KB are good candidates for inscription
    const isSmallFile = file.size <= 10240; // 10KB
    const isCriticalType = criticalTypes.includes(file.type);
    
    return isSmallFile || isCriticalType;
  }
  
  /**
   * Utility function to hash data for integrity verification
   */
  static async hashData(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
