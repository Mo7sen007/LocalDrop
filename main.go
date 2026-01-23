package main

import (
	"log"

	"github.com/Mo7sen007/LocalDrop/cmd"
	"github.com/Mo7sen007/LocalDrop/internal/config"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
)

func main() {
	log.Println("Starting main")
	config.LoadDotEnv()
	storage.Init()
	log.Println("Loaded .env")
	cmd.Execute()
	log.Println("cmd.Execute() returned")
}
