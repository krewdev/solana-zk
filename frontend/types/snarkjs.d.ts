declare module 'snarkjs' {
  export namespace groth16 {
    function fullProve(
      inputs: any,
      wasmPath: string,
      zkeyPath: string
    ): Promise<{
      proof: any;
      publicSignals: any;
    }>;
  }
}