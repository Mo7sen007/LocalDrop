package main

import (
	"github.com/Mo7sen007/LocalDrop/cmd"
	"github.com/Mo7sen007/LocalDrop/internal/config"
)

func main() {

	config.LoadDotEnv()

	cmd.Execute()

}
