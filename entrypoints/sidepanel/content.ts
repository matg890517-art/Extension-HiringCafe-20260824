export const server_status = (num:Number) => {
    switch(num){
        case 0:
            return 'Disconnect. Check your network status or URL';
        case 1:
            return 'Connecting...';
        case 2:
            return 'Server Connect.';
        case -1:
            return 'Bad Network Status';
        default:
            return 'Unknown case.'
    }
}

export const server_status_color = (num:Number) => {
    switch(num){
        case 0:
            return 'error.main';
        case 1:
            return 'warning.main';
        case 2:
            return 'primary.main';
        case -1:
            return 'seconary.main';
        default:
            return 'seconary.main'
    }
}