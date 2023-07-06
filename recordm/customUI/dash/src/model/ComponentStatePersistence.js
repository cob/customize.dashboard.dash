window.CoBDasHDebug = window.CoBDasHDebug || {}
const DEBUG = window.CoBDasHDebug
// window.CoBDasHDebug.state = true

class ComponentStatePersistence {
    constructor(id,updateCb) {
        if(DEBUG.state) console.log("DASH: STATE: create id=",id)
        this._id = id
        this.content = this._getStateFromHash()
        if(updateCb) updateCb(this.content)
        this._onHashChange = function() {
            if(this.content != this._getStateFromHash() ) {
                this.content = this._getStateFromHash()
                if(DEBUG.state) console.log("DASH: STATE: Hash changed id=",this._id," content=",this._content)
                if(updateCb) updateCb(this.content)
            }
        }.bind(this)
        window.addEventListener('hashchange', this._onHashChange, true);
    }
    
    get content() {
        return this._content
    }

    set content(newContent) {
        if(DEBUG.state) console.log("DASH: STATE: update id=", this._id," changed=", JSON.stringify(this._content) !== JSON.stringify(newContent), " old=",JSON.stringify(this._content), " new=",JSON.stringify(newContent))
        if (JSON.stringify(this._content) !== JSON.stringify(newContent)) {
            this._content = newContent
            this._setStateInHash()
        }
    }

    stop() {
        if(DEBUG.state) console.log("DASH: STATE: stopped id=",this._id)
        window.removeEventListener('hashchange', this._onHashChange, true)
    }
    
    _getStateFromHash() {
        const hashParts = window.location.hash.split("/")
        try {
            const [name, ...rest] = hashParts[2].split(":")
            let statesInHash = rest.length > 1 ? JSON.parse(decodeURIComponent(rest.join(":"))) : {}
            return statesInHash[this._id]
        } catch (e) {
            if(DEBUG.state) console.error("DASH: STATE: invalid parse of hash=", decodeURIComponent(rest.join(":")))
            return undefined
        }
    }

    _setStateInHash() {
        const hashParts = window.location.hash.split("/")
        const [name, ...rest] = hashParts[2].split(":")
        try {
            let statesInHash = rest.length > 1 ? JSON.parse(decodeURIComponent(rest.join(":"))) : {}

            // Update if content changed and we are still in a dash custom-UI
            if(JSON.stringify(statesInHash[this._id]) !== JSON.stringify(this._content) && hashParts[3] && hashParts[3].startsWith("dash") ) {
                // Update id property or remove it, if content is empty
                if( this._content ) {
                    statesInHash[this._id] = this._content
                } else {
                    delete statesInHash[this._id]
                }
        
                hashParts[2] = Object.keys(statesInHash).length > 0 ? `${name}:${JSON.stringify(statesInHash)}` : name
        
                const newDestination = hashParts.join("/")
                if(history.pushState) {
                    history.pushState(null, null, newDestination);
                }
                else {
                    location.hash = newDestination;
                }
            }
        }
        catch (e) {
            if(DEBUG.state) console.error("DASH: STATE: invalid parse of hash=", decodeURIComponent(rest.join(":")))
        }
    }
}

export default ComponentStatePersistence