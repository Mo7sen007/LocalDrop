package main

import (
	"log"

	"github.com/Mo7sen007/LocalDrop/cmd"
	"github.com/Mo7sen007/LocalDrop/internal/config"
)

func main() {
	log.Println("Starting main")
	config.LoadDotEnv()
	log.Println("Loaded .env")
	cmd.Execute()
	log.Println("cmd.Execute() returned")
}
