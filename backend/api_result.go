package backend

import "strings"

// ApiResult is the canonical backend response contract for frontend actions.
// It avoids fragile string-prefix parsing and provides stable error codes.
type ApiResult struct {
	OK      bool        `json:"ok"`
	Message string      `json:"message"`
	Code    string      `json:"code,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

func SuccessResult(message string) ApiResult {
	return ApiResult{OK: true, Message: message}
}

func SuccessResultWithData(message string, data interface{}) ApiResult {
	return ApiResult{OK: true, Message: message, Data: data}
}

func ErrorResult(code string, message string) ApiResult {
	return ApiResult{OK: false, Code: code, Message: message}
}

func legacyResult(result string) ApiResult {
	trimmed := strings.TrimSpace(result)
	lower := strings.ToLower(trimmed)

	if strings.HasPrefix(lower, "success") {
		return SuccessResult(trimmed)
	}
	if strings.HasPrefix(lower, "error") {
		return ErrorResult("LEGACY_ERROR", trimmed)
	}

	return SuccessResult(trimmed)
}
