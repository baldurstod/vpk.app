export type JSONValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| JSONValue[]
	| JSONObject

export interface JSONObject {
	[k: string]: JSONValue
}

export interface JSONArray extends Array<JSONValue> { }
