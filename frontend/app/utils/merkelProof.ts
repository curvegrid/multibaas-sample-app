import { poseidon2 } from "poseidon-lite"
import { LeanIMT } from "@zk-kit/lean-imt";

export async function generateMerkleProof(
  commitmentsArray: bigint[],
  index: number,
) {
  const hash = (a: bigint, b: bigint) => poseidon2([a, b])

  // Initialize the Merkle tree
  const tree = new LeanIMT<bigint>(hash);

  // Insert the commitments into the tree
  for (const commitment of commitmentsArray) {
    tree.insert(commitment);
  }

  // Generate the proof for the leaf at the given index
  const proof = tree.generateProof(index);

  // The proof object already has the structure we need
  const merkleProof = {
    root: proof.root,
    leaf: proof.leaf,
    index: proof.index,
    siblings: proof.siblings,
  };

  return merkleProof;
}
