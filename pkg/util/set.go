package util

import "iter"

type Set[T comparable] map[T]struct{}

func NewSet[T comparable]() Set[T] {
	return make(Set[T])
}

func (t Set[T]) Exists(v T) bool {
	if t == nil {
		return false
	}
	_, ok := t[v]
	return ok
}

func (t Set[T]) Insert(v T) (inserted bool) {
	if t.Exists(v) {
		return false
	}
	t[v] = struct{}{}
	return true
}

func (t Set[T]) Remove(v T) (removed bool) {
	if !t.Exists(v) {
		return false
	}
	delete(t, v)
	return true
}

func (t Set[T]) Iter() iter.Seq[T] {
	if t == nil {
		return nil
	}
	return func(yield func(T) bool) {
		for v := range t {
			if !yield(v) {
				return
			}
		}
	}
}

func (t Set[T]) Collect() []T {
	if t == nil {
		return nil
	}
	res := make([]T, 0, len(t))
	for v := range t {
		res = append(res, v)
	}
	return res
}
