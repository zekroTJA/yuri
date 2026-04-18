package database

func (t *Database) CreateAPIKey(name string, hash []byte, salt []byte, hint string, scopes []Scope, ownerID uint) (*APIKey, error) {
	key := &APIKey{
		Name:    name,
		Hash:    hash,
		Salt:    salt,
		Hint:    hint,
		Scopes:  scopes,
		OwnerID: ownerID,
	}
	res := t.db.Create(key)
	return key, mapError(res.Error)
}

func (t *Database) ListAPIKeysByOwner(ownerID uint) ([]*APIKey, error) {
	var keys []*APIKey
	res := t.db.Where("owner_id = ?", ownerID).Find(&keys)
	return keys, mapError(res.Error)
}

func (t *Database) ListAPIKeysByHint(hint string) ([]*APIKey, error) {
	var keys []*APIKey
	res := t.db.Preload("Owner").Where("hint = ?", hint).Find(&keys)
	return keys, mapError(res.Error)
}

func (t *Database) GetAPIKeyByID(id uint) (*APIKey, error) {
	var key APIKey
	res := t.db.First(&key, id)
	return &key, mapError(res.Error)
}

func (t *Database) UpdateAPIKey(id uint, name string) (*APIKey, error) {
	var key APIKey
	if res := t.db.First(&key, id); res.Error != nil {
		return nil, mapError(res.Error)
	}
	key.Name = name
	res := t.db.Save(&key)
	return &key, mapError(res.Error)
}

func (t *Database) DeleteAPIKey(id uint) error {
	res := t.db.Delete(&APIKey{}, id)
	return mapError(res.Error)
}
