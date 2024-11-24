def extract_data(record):
    """
    Extracts the relevant data fields (`kit`, `state`, and `updatedAt`) from a JSON record.
    """
    data_key = record['key']

    # fetch JSON fields
    kit = execute('JSON.GET', data_key, 'kit')
    state = execute('JSON.GET', data_key, 'state')
    updated_at = execute('JSON.GET', data_key, 'updatedAt')

    return { 'kit': kit[1:-1], 'state': int(state), 'updated_at': int(updated_at) } #trim kit without `"` at the beginning and the end

def update_maximums(data):
    """
    Compares and updates the maximum `state` and `updatedAt` for the given `kit`.
    """
    kit_key = 'kit:' + data['kit']

    # update max state
    max_state = execute('HGET', kit_key, 'maxState')
    max_state = int(max_state) if max_state else 0
    if data['state'] > max_state:
        execute('HSET', kit_key, 'maxState', data['state'])

    # update max updatedAt
    max_updated_at = execute('HGET', kit_key, 'maxUpdatedAt')
    max_updated_at = int(max_updated_at) if max_updated_at else 0
    if data['updated_at'] > max_updated_at:
        execute('HSET', kit_key, 'maxUpdatedAt', data['updated_at'])

gb = GearsBuilder()
gb.map(extract_data)
gb.foreach(update_maximums)
gb.register('tile:*')
