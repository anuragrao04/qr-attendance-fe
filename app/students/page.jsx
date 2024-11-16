'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function Component() {
  const [srnParts, setSrnParts] = useState({
    part1: '1',
    part2: '22',
    part3: 'CS',
    part4: ''
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()

  const handlePartChange = (part, value) => {
    setSrnParts(prev => ({ ...prev, [part]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsDialogOpen(true)
  }

  const handleConfirm = () => {
    const fullSrn = `PES${srnParts.part1}UG${srnParts.part2}${srnParts.part3}${srnParts.part4.padStart(3, '0')}`
    if (fullSrn.length === 13) {
      router.push(`/students/scan?srn=${encodeURIComponent(fullSrn)}`)
    }
    setIsDialogOpen(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Enter Your SRN</CardTitle>
          <CardDescription className="text-center text-sm">
            Please select the components of your SRN
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-16 text-center font-medium">PES</div>
                <Select value={srnParts.part1} onValueChange={(value) => handlePartChange('part1', value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-16 text-center font-medium">UG</div>
                <Select value={srnParts.part2} onValueChange={(value) => handlePartChange('part2', value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="22">22</SelectItem>
                    <SelectItem value="23">23</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={srnParts.part3} onValueChange={(value) => handlePartChange('part3', value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CS">CS</SelectItem>
                    <SelectItem value="EC">EC</SelectItem>
                    <SelectItem value="AM">AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="lastThreeDigits" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Last 3 digits
                </label>
                <Input
                  id="lastThreeDigits"
                  placeholder="Enter last 3 digits"
                  value={srnParts.part4}
                  onChange={(e) => handlePartChange('part4', e.target.value.slice(0, 3))}
                  pattern="\d{3}"
                  maxLength={3}
                  required
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit">
              Submit
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{`PES${srnParts.part1}UG${srnParts.part2}${srnParts.part3}${srnParts.part4.padStart(3, '0')}`}</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your SRN? Please note that you will not be allowed to give attendance to any other SRN for the next half an hour once submitted
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
