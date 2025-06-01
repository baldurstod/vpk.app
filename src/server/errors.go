package main

import "errors"

type NotFoundError struct{}

func (e NotFoundError) Error() string {
	return "Not found"
}

type ApiErrorCode int

const (
	UnexpectedError = iota
)

var apiErrorValues = map[ApiErrorCode]error{
	UnexpectedError: errors.New("unexpected error, contact support"),
}

type apiError interface {
	Error() string
	isApiError() bool
}

type apiError2 struct {
	StatusCode int
	Err        error
}

func (e apiError2) Error() string {
	return e.Err.Error()
}

func (e apiError2) isApiError() bool {
	return true
}

func CreateApiError(c ApiErrorCode) apiError2 {
	e := apiErrorValues[c]
	return apiError2{Err: e}
}
