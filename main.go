package main

import (
	"github.com/Mo7sen007/LocalDrop/cmd"
	"github.com/Mo7sen007/LocalDrop/internal/config"
	"github.com/Mo7sen007/LocalDrop/internal/storage"
)

func main() {

	config.LoadDotEnv()
	storage.Init()

	cmd.Execute()

}
