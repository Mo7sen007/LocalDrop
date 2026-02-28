package models

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
)

type UploadJob struct {
	// Identity / lifecycle
	JobID      uuid.UUID  `json:"id"`
	Status     JobStatus  `json:"status"`
	Error      string     `json:"error,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	StartedAt  *time.Time `json:"started_at,omitempty"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
	Attempts   int        `json:"attempts"`

	// Request metadata (safe to expose)
	ContentType    string     `json:"content_type,omitempty"` // e.g. "file" / "folder" (match your form field)
	DisplayName    string     `json:"display_name,omitempty"`
	OriginalName   string     `json:"original_name,omitempty"`
	SizeBytes      int64      `json:"size_bytes,omitempty"`
	ParentFolderID *uuid.UUID `json:"parent_folder_id,omitempty"`

	// Sensitive / internal (do NOT expose)
	TempPath string `json:"-"` // server temp file path used by worker
	PinCode  string `json:"-"` // consider hashing/encrypting if you persist jobs

	// Result (what the worker produced)
	FileID *uuid.UUID `json:"file_id,omitempty"`
}

type JobManager struct {
	jobs       map[string]*UploadJob
	workers    int
	queue      chan *UploadJob
	mu         sync.RWMutex
	wg         sync.WaitGroup
	stop       chan struct{}
	shutdownMu sync.Mutex
}

func NewJobManager(workers int) *JobManager {
	jm := &JobManager{
		jobs:    make(map[string]*UploadJob),
		workers: workers,
		queue:   make(chan *UploadJob, 100), // buffered channel for job queue
		stop:    make(chan struct{}),
	}
	jm.startWorkers()
	return jm
}

func (jm *JobManager) startWorkers() {
	for i := 0; i < jm.workers; i++ {
		jm.wg.Add(1)
		go jm.worker()
	}
}

func (jm *JobManager) worker() {
	defer jm.wg.Done()
	for {
		select {
		case job := <-jm.queue:
			jm.processJob(job)
		case <-jm.stop:
			return
		}
	}
}

func (jm *JobManager) processJob(job *UploadJob) {
	// Placeholder for actual processing logic
	time.Sleep(2 * time.Second) // simulate work
	job.Status = JobStatusCompleted
	now := time.Now()
	job.FinishedAt = &now
}

func (jm *JobManager) AddJob(job *UploadJob) {
	jm.mu.Lock()
	defer jm.mu.Unlock()
	jm.jobs[job.JobID.String()] = job
	jm.queue <- job
}

func (jm *JobManager) GetJob(id string) (*UploadJob, bool) {
	jm.mu.RLock()
	defer jm.mu.RUnlock()
	job, exists := jm.jobs[id]
	return job, exists
}

func (jm *JobManager) Shutdown() {
	jm.shutdownMu.Lock()
	defer jm.shutdownMu.Unlock()
	close(jm.stop)
	jm.wg.Wait()
}
