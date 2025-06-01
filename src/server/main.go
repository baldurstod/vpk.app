package main

import (
	"encoding/json"
	"log"
	"os"
)

var ReleaseMode = "true"

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	config := Config{}
	if content, err := os.ReadFile("config.json"); err == nil {
		if err = json.Unmarshal(content, &config); err == nil {
			startServer(config)
		} else {
			log.Println("Error while reading configuration", err)
		}
	} else {
		log.Println("Error while reading configuration file", err)
	}
}
