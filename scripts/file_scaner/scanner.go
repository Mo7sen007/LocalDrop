package filescaner

import (
	"bytes"
	"fmt"
	"io"
	"os"

	"github.com/Mo7sen007/LocalDrop/scripts"
)

type ScanResult struct {
	Safe           bool
	SuspiciousTags map[string]int
	Entropy        float64
	Reason         []string
}

func NewScanResult() ScanResult {
	return ScanResult{
		Safe:           false,
		SuspiciousTags: nil,
		Entropy:        0,
		Reason:         nil,
	}
}

var suspiciousTags = [][]byte{
	[]byte("/JavaScript"), []byte("/JS"),
	[]byte("/Launch"), []byte("/EmbeddedFile"),
	[]byte("/OpenAction"), []byte("/AA"),
	[]byte("/URI"), []byte("/RichMedia"),
	[]byte("/GoToR"), []byte("/Action"),
	[]byte("/SubmitForm"), []byte("/ResetForm"),
	[]byte("/Sound"), []byte("/Movie"),
	[]byte("/Encrypt"), []byte("/Filter /Crypt"),
}

func ScanPDF(path string) (ScanResult, error) {
	report := NewScanResult()
	file, err := os.Open(path)
	if err != nil {
		return report, fmt.Errorf("could not open file: %w", err)
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return report, fmt.Errorf("could not read file: %w", err)
	}
	entropy, err := scripts.CalculateEntropy(content)
	if err != nil {
		report.Entropy = entropy
		return report, err
	}
	safe := true

	tagHits := make(map[string]int)

	for _, tag := range suspiciousTags {
		count := bytes.Count(content, tag)
		if count > 0 {
			safe = false
			tagHits[string(tag)] = count
		}
	}

	for tag, count := range tagHits {

		reason := fmt.Sprintf("⚠️ Found %d instance(s) of %s\n", count, tag)
		report.Reason = append(report.Reason, reason)
	}
	report.Safe = safe
	report.SuspiciousTags = tagHits
	return report, nil

}
