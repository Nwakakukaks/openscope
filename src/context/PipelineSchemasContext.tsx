"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getBackendUrl } from "@/hooks/useScopeServer";

const SCOPE_API_URL = "/api/scope";

interface SchemaProperty {
  type?: string;
  default?: unknown;
  description?: string;
  ui?: {
    is_load_param?: boolean;
    label?: string;
    order?: number;
  };
}

interface PipelineInfo {
  id: string;
  name: string;
  description?: string;
  supported_modes?: string[];
  default_mode?: string;
  plugin_name?: string;
  config_schema?: Record<string, unknown>;
  usage?: string[];
}

interface PipelineSchemasContextType {
  pipelineSchemas: Record<string, PipelineInfo>;
  isLoading: boolean;
  runtimeParams: Record<string, string[]>;
}

const PipelineSchemasContext = createContext<PipelineSchemasContextType>({
  pipelineSchemas: {},
  isLoading: true,
  runtimeParams: {},
});

export function PipelineSchemasProvider({ children }: { children: ReactNode }) {
  const [pipelineSchemas, setPipelineSchemas] = useState<Record<string, PipelineInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [runtimeParams, setRuntimeParams] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}${SCOPE_API_URL}/pipelines`);
        if (response.ok) {
          const data = await response.json(); 
          const schemas = data.pipelines as Record<string, PipelineInfo>;
          setPipelineSchemas(schemas);

          // Extract runtime params (is_load_param === false) for each pipeline
          const runtime: Record<string, string[]> = {};
          Object.entries(schemas).forEach(([id, info]) => {
            const configSchema = info.config_schema as { properties?: Record<string, { ui?: { is_load_param?: boolean } }> } | undefined;
            if (configSchema?.properties) {
              runtime[id] = Object.entries(configSchema.properties)
                .filter(([, prop]) => prop.ui?.is_load_param === false)
                .map(([key]) => key);
            } else {
              runtime[id] = [];
            }
          });
          setRuntimeParams(runtime);
        }
      } catch (error) {
        console.error("Failed to fetch pipeline schemas:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchemas();
  }, []);

  return (
    <PipelineSchemasContext.Provider value={{ pipelineSchemas, isLoading, runtimeParams }}>
      {children}
    </PipelineSchemasContext.Provider>
  );
}

export function usePipelineSchemas() {
  return useContext(PipelineSchemasContext);
}
