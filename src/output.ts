/**
 * Unwrap API response envelope to extract the useful data.
 * Handles: { body: { data: [...], total } }, { data: [...], total }, or passthrough.
 */
export interface UnwrappedResponse {
  data: any;
  total?: number;
}

export function unwrapResponse(response: any): UnwrappedResponse {
  if (!response || typeof response !== "object") {
    return { data: response };
  }

  // { body: { data, total } }
  if (response.body && typeof response.body === "object") {
    const body = response.body;
    if ("data" in body) {
      return { data: body.data, total: body.total };
    }
    return { data: body };
  }

  // { data, total }
  if ("data" in response) {
    return { data: response.data, total: response.total };
  }

  return { data: response };
}

export function formatJson(unwrapped: UnwrappedResponse): string {
  if (unwrapped.total !== undefined && Array.isArray(unwrapped.data)) {
    return JSON.stringify({ data: unwrapped.data, total: unwrapped.total }, null, 2);
  }
  return JSON.stringify(unwrapped.data, null, 2);
}
