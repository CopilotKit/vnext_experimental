import * as PartialJSON from "partial-json";
import { v4 as uuidv4 } from "uuid";

export function randomUUID() {
  return uuidv4();
}

export function partialJSONParse(json: string) {
  try {
    return PartialJSON.parse(json);
  } catch (error) {
    return {};
  }
}
