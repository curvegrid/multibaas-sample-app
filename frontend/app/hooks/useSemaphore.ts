import { useEffect, useState } from "react"
import { Identity } from "@semaphore-protocol/identity"
import { useRouter } from "next/navigation"

export default function useSemaphore() {
    const router = useRouter()
    const [identity, setIdentity] = useState<Identity>()

    useEffect(() => {
        const privateKey = localStorage.getItem("identity")

        if (!privateKey) {
            router.push("/")
            return
        }

        setIdentity(Identity.import(privateKey))
    }, [router])

    const createIdentity = async () => {
        const newIdentity = new Identity()

        setIdentity(newIdentity)

        localStorage.setItem("identity", newIdentity.export())
    }

    return {
        identity,
        createIdentity,
    }
}
