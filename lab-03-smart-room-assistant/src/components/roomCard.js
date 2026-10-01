import React from 'react';

function RoomCard({ room, onToggleLight }) {
    return (
        <div className="room-card">
            <h2>{room.name}</h2>
            <p>Temperature: {room.temperature} °C</p>
            <p>Light Status: {room.light ? 'On' : 'Off'}</p>
            <button onClick={() => onToggleLight(room.id)}>
                {room.light ? 'Turn Off Light' : 'Turn On Light'}
            </button>
        </div>
    );
}

export default RoomCard;