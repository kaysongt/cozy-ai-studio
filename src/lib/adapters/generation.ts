export const GROK_IMAGINE_TODO =
  "TODO(grok-imagine): No render is requested. When Cozy Digital has the xAI media model name, whether XAI_API_KEY covers it, and the asset callback shape, replace this stub. Do not download third-party footage here.";

export const HIGGSFIELD_TODO =
  "TODO(higgsfield): Higgsfield is not connected. Add HIGGSFIELD_API_KEY, base URL, and the generation-job schema before replacing this stub. Do not scrape reference clips.";

export interface ShotPrompt {
  id: string;
  visual: string;
  durationSec: number;
}

export interface GenerationRequest {
  jobId: string;
  styleNotes: string;
  shots: ShotPrompt[];
}

export interface GeneratedAsset {
  adapter: "grok-imagine" | "higgsfield";
  shotId: string;
  stub: true;
  status: "stubbed";
  mediaOriginal: true;
  note: string;
}

export interface GenerationReceipt {
  adapter: "grok-imagine" | "higgsfield";
  stub: true;
  assets: GeneratedAsset[];
  todo: string;
}

export interface GenerationAdapter {
  id: "grok-imagine" | "higgsfield";
  generate(input: GenerationRequest): Promise<GenerationReceipt>;
}

export const grokImagineAdapter: GenerationAdapter = {
  id: "grok-imagine",
  async generate(input) {
    return {
      adapter: "grok-imagine",
      stub: true,
      todo: GROK_IMAGINE_TODO,
      assets: input.shots.map((shot) => ({
        adapter: "grok-imagine",
        shotId: shot.id,
        stub: true,
        status: "stubbed",
        mediaOriginal: true,
        note: `Stub frame for ${shot.id}: ${shot.visual}`,
      })),
    };
  },
};

export const higgsfieldAdapter: GenerationAdapter = {
  id: "higgsfield",
  async generate(input) {
    return {
      adapter: "higgsfield",
      stub: true,
      todo: HIGGSFIELD_TODO,
      assets: input.shots.map((shot) => ({
        adapter: "higgsfield",
        shotId: shot.id,
        stub: true,
        status: "stubbed",
        mediaOriginal: true,
        note: `Stub motion pass for ${shot.id} (${shot.durationSec}s).`,
      })),
    };
  },
};
