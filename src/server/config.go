package main

type Config struct {
	HTTPS `json:"https"`
	Games []Game `json:"games"`
}

type HTTPS struct {
	Port          int    `json:"port"`
	HttpsKeyFile  string `json:"https_key_file"`
	HttpsCertFile string `json:"https_cert_file"`
}

type Game struct {
	Name           string   `json:"name"`
	Path           string   `json:"path"`
	AppId          int      `json:"app_id"`
	VpkSearchPaths []string `json:"vpk_search_paths"`
}
