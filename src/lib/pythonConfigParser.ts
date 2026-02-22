export interface ParsedParam {
  name: string;
  type: "float" | "int" | "bool" | "str";
  default: number | boolean | string;
  min?: number;
  max?: number;
  label?: string;
  description?: string;
  order?: number;
}

export interface ParsedConfig {
  pipelineId?: string;
  pipelineName?: string;
  pipelineDescription?: string;
  params: ParsedParam[];
}

export function parsePythonConfig(code: string): ParsedConfig {
  const result: ParsedConfig = {
    params: [],
  };

  // Extract pipeline_id
  const pipelineIdMatch = code.match(/pipeline_id\s*[=:]\s*["']([^"']+)["']/);
  if (pipelineIdMatch) {
    result.pipelineId = pipelineIdMatch[1];
  }

  // Extract pipeline_name
  const pipelineNameMatch = code.match(/pipeline_name\s*[=:]\s*["']([^"']+)["']/);
  if (pipelineNameMatch) {
    result.pipelineName = pipelineNameMatch[1];
  }

  // Extract pipeline_description
  const pipelineDescMatch = code.match(/pipeline_description\s*[=:]\s*["']([^"']+)["']/);
  if (pipelineDescMatch) {
    result.pipelineDescription = pipelineDescMatch[1];
  }

  // Extract Field definitions from Config class
  // Pattern: param_name: type = Field(default=..., ge=..., le=..., description="...", json_schema_extra=ui_field_config(...))
  const fieldPattern = /(\w+):\s*(float|int|str|bool)\s*=\s*Field\s*\(\s*default\s*=\s*([^,]+)/g;
  
  let match;
  while ((match = fieldPattern.exec(code)) !== null) {
    const paramName = match[1];
    const paramType = match[2];
    const defaultStr = match[3].trim();

    // Skip ClassVar fields (pipeline metadata)
    if (paramName === "pipeline_id" || paramName === "pipeline_name" || 
        paramName === "pipeline_description" || paramName === "supports_prompts" ||
        paramName === "modes" || paramName === "usage") {
      continue;
    }

    // Parse default value
    let defaultValue: number | boolean | string;
    if (paramType === "bool") {
      defaultValue = defaultStr.toLowerCase() === "true";
    } else if (paramType === "float") {
      defaultValue = parseFloat(defaultStr);
    } else if (paramType === "int") {
      defaultValue = parseInt(defaultStr);
    } else {
      defaultValue = defaultStr.replace(/["']/g, "");
    }

    const param: ParsedParam = {
      name: paramName,
      type: paramType as ParsedParam["type"],
      default: defaultValue,
    };

    // Extract ge (minimum)
    const geMatch = code.match(new RegExp(`${paramName}[^:]*ge\\s*=\\s*(\\d+\\.?\\d*)`));
    if (geMatch) {
      param.min = parseFloat(geMatch[1]);
    }

    // Extract le (maximum)
    const leMatch = code.match(new RegExp(`${paramName}[^:]*le\\s*=\\s*(\\d+\\.?\\d*)`));
    if (leMatch) {
      param.max = parseFloat(leMatch[1]);
    }

    // Extract description
    const descMatch = code.match(new RegExp(`${paramName}[^:]*description\\s*=\\s*["']([^"']+)["']`));
    if (descMatch) {
      param.description = descMatch[1];
    }

    // Extract label and order from ui_field_config
    const uiConfigMatch = code.match(
      new RegExp(`${paramName}[^:]*ui_field_config\\s*\\(\\s*([^)]+)\\)`)
    );
    if (uiConfigMatch) {
      const uiContent = uiConfigMatch[1];
      
      const labelMatch = uiContent.match(/label\s*=\s*["']([^"']+)["']/);
      if (labelMatch) {
        param.label = labelMatch[1];
      }

      const orderMatch = uiContent.match(/order\s*=\s*(\d+)/);
      if (orderMatch) {
        param.order = parseInt(orderMatch[1]);
      }
    }

    // Use param name as label if no label defined
    if (!param.label) {
      param.label = paramName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }

    result.params.push(param);
  }

  // Sort by order if available
  result.params.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return result;
}

export function parsedParamsToConfigFields(params: ParsedParam[]): Array<{
  label: string;
  type: string;
  min?: number;
  max?: number;
  options?: string[];
  description?: string;
}> {
  return params.map((param) => {
    const field: {
      label: string;
      type: string;
      min?: number;
      max?: number;
      options?: string[];
      description?: string;
    } = {
      label: param.label || param.name,
      type: "text",
    };

    // Determine field type
    if (param.type === "bool") {
      field.type = "toggle";
    } else if (param.type === "int" || param.type === "float") {
      if (param.min !== undefined && param.max !== undefined) {
        field.type = "slider";
        field.min = param.min;
        field.max = param.max;
      } else {
        field.type = "number";
      }
    } else if (param.type === "str") {
      // Check if it's an enum-like string (has limited options)
      if (param.name.toLowerCase().includes("mode") || param.name.toLowerCase().includes("shader")) {
        // These are typically enum-like, but we can't extract the options easily
        // Default to text
        field.type = "text";
      } else {
        field.type = "text";
      }
    }

    if (param.description) {
      field.description = param.description;
    }

    return field;
  });
}
