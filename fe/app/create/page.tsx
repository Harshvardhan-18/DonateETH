   "use client";

    import { Navbar } from "@/components/navbar";
    import { Button } from "@/components/ui/button";
    import { Card } from "@/components/ui/card";
    import { Input } from "@/components/ui/input";
    import { Textarea } from "@/components/ui/textarea";
    import { Label } from "@/components/ui/label";
    import { useEffect, useState } from "react";
    import { Loader2 } from "lucide-react";
    import { motion } from "framer-motion";
    import axios from "axios";
    import { useAccount } from "wagmi";
    import { checkImageExistsOnWeb } from "./geminiapi"; // Import the new function
    import { apiUrl } from "@/lib/api";
    
    export default function CreateCampaignPage() {
      const { address, isConnected } = useAccount();
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [title, setTitle] = useState("");
      const [description, setDescription] = useState("");
      const [imageUrl, setImage] = useState("");
      const [imageFile, setImageFile] = useState<File | null>(null);
      const [imageCheckResult, setImageCheckResult] = useState<string | null>(null);
      const [isCheckingImage, setIsCheckingImage] = useState(false);
      const [raised, setRaised] = useState("");
      const [goal, setGoal] = useState("");
      const [daysLeft, setDaysLeft] = useState("");
      const [ngoRegistrationNumber, setNgoRegistrationNumber] = useState("");
      const [ngoAllowed, setNgoAllowed] = useState(false);
      const [isNgoChecking, setIsNgoChecking] = useState(false);
      const [contactName, setContactName] = useState("");
      const [contactEmail, setContactEmail] = useState("");
      const [contactPhone, setContactPhone] = useState("");
      const [certificateFile, setCertificateFile] = useState<File | null>(null);
      const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null);
      const [milestones, setMilestones] = useState([
        { title: "", amount: "" },
        { title: "", amount: "" },
        { title: "", amount: "" },
      ]);
    
      useEffect(() => {
        setDaysLeft("30");
        setRaised("0");
      }, []);
    
      useEffect(() => {
        const checkNgo = async () => {
          // Wagmi can briefly report `isConnected=false` during reconnect.
          // If we already have an address, we can still check approval.
          if (!address) {
            setNgoAllowed(false);
            return;
          }

          setIsNgoChecking(true);
          try {
            const walletAddress = address.toLowerCase();
            console.log("Checking NGO status for wallet address:", walletAddress);
            const res = await fetch(apiUrl(`/ngos/me?walletAddress=${walletAddress}`), { cache: "no-store" });
            console.log(res);
            if (!res.ok) throw new Error("Failed to check NGO status");
            const data = await res.json();
            setNgoAllowed(Boolean(data.allowed));
            // Prefill registration number for approved NGOs.
            if (data?.ngo?.registrationNumber) {
              setNgoRegistrationNumber((prev) => prev || data.ngo.registrationNumber);
            }
          } catch (error) {
            console.error("Error checking NGO status:", error);
            setNgoAllowed(false);
          } finally {
            setIsNgoChecking(false);
          }
        };

        checkNgo();
      }, [address]);

      const canCreate = Boolean(isConnected && ngoAllowed);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreate) {
          alert("Only registered and approved NGOs can create campaigns. Please register at /ngos.");
          setIsSubmitting(false);
          return;
        }
        if (!ngoRegistrationNumber) {
          alert("NGO registration number is required.");
          setIsSubmitting(false);
          return;
        }
        setIsSubmitting(true);
        
        // Check if the image exists on the web before submitting
        if (imageFile && !imageCheckResult) {
          try {
            setIsCheckingImage(true);
            const result = await checkImageExistsOnWeb(imageFile);
            setImageCheckResult(result);
            
            if (result === "found it") {
              alert("This image appears to exist on the web. Please use an original image for your campaign.");
              setIsSubmitting(false);
              setIsCheckingImage(false);
              return;
            }
            setIsCheckingImage(false);
          } catch (error) {
            console.error("Error checking image:", error);
            setIsCheckingImage(false);
          }
        }
      
        const formData = new FormData();
        
        // Add basic form data
        formData.append("title", title);
        formData.append("description", description);
        formData.append("raised", raised);
        formData.append("goal", goal);
        formData.append("daysLeft", daysLeft);
        formData.append("ngoRegistrationNumber", ngoRegistrationNumber);
        formData.append("contactName", contactName);
        formData.append("contactEmail", contactEmail);
        formData.append("contactPhone", contactPhone);
        
        // Add wallet address if connected
        if (isConnected && address) {
          formData.append("walletaddress", address);
        }
        
        // Add image files
        if (imageFile) {
          formData.append("imageUrl", imageFile);
        } else if (imageUrl) {
          formData.append("imageUrlLink", imageUrl);
        }
        
        if (certificateFile) {
          formData.append("certificateFile", certificateFile);
        }
        
        if (supportingDocFile) {
          formData.append("supportingDocFile", supportingDocFile);
        }
        
        // Add milestones
        formData.append("milestones", JSON.stringify(milestones));
    
        try {
          const response = await axios.post(apiUrl("/create-campaign"), formData);
      
          const data = await response.data;
          if (data.success) {
            alert("Campaign created successfully!");
          } else { 
            alert(data.message || "An error occurred.");
          }
        } catch (error) {
          console.error("Error creating campaign:", error);
          alert("Error creating campaign");
        } finally {
          setIsSubmitting(false);
        }
      };
    
      const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setImageFile(file);
          setImage("");  // Clear the URL if a file is selected
          setImageCheckResult(null); // Reset the check result when a new image is selected
        }
      };
      
      // New function to check image without submitting the form
      const handleCheckImage = async () => {
        if (!imageFile) {
          alert("Please select an image first");
          return;
        }
        
        setIsCheckingImage(true);
        try {
          const result = await checkImageExistsOnWeb(imageFile);
          setImageCheckResult(result);
          
          if (result === "found it") {
            alert("This image appears to exist on the web. Please use an original image for your campaign.");
          } else if (result === "not found") {
            alert("Image check passed. The image appears to be original.");
          } else {
            alert("Image check result: " + result);
          }
        } catch (error) {
          console.error("Error checking image:", error);
          alert("Error checking image");
        } finally {
          setIsCheckingImage(false);
        }
      };
      
      const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
          setCertificateFile(e.target.files[0]);
        }
      };
      
      const handleSupportingDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
          setSupportingDocFile(e.target.files[0]);
        }
      };
      
      return (
        <main className="min-h-screen bg-background">
          <Navbar />
    
          <div className="flex flex-col items-center justify-center pt-24">
            <div className="w-full max-w-2xl text-center">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-4xl font-bold text-primary"
              >
                Create Campaign
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="mt-2 text-lg text-muted-foreground"
              >
                Start your fundraising campaign and make a difference.
              </motion.p>

                {isNgoChecking ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground"
                  >
                    Checking your NGO registration...
                  </motion.div>
                ) : isConnected && !ngoAllowed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200"
                  >
                    Only registered and approved NGOs can create campaigns. Register at{" "}
                    <a href="/ngos" className="underline">/ngos</a>.
                  </motion.div>
                ) : null}
            </div>
    
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="mt-8 w-full max-w-lg space-y-8 mb-16"
            >
              <Card className="p-6 rounded-lg shadow-md">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="pl-1">
                      Campaign Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter campaign title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
    
                  <div className="space-y-2">
                    <Label htmlFor="description" className="pl-1">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your campaign"
                      className="min-h-[150px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>
    
                  <div className="space-y-2">
                    <Label htmlFor="ngoRegistrationNumber" className="pl-1">
                      NGO Registration Number
                    </Label>
                    <Input
                      id="ngoRegistrationNumber"
                      placeholder="Enter NGO registration number"
                      value={ngoRegistrationNumber}
                      onChange={(e) => setNgoRegistrationNumber(e.target.value)}
                      required
                      disabled={canCreate && Boolean(ngoRegistrationNumber)}
                      readOnly={canCreate && Boolean(ngoRegistrationNumber)}
                    />
                  </div>
    
                  <div className="space-y-4">
                    <h3 className="font-medium pl-1">Contact Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactName" className="pl-1">
                          Contact Name
                        </Label>
                        <Input
                          id="contactName"
                          placeholder="Enter contact name"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone" className="pl-1">
                          Contact Phone
                        </Label>
                        <Input
                          id="contactPhone"
                          placeholder="Enter contact phone"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail" className="pl-1">
                        Contact Email
                      </Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="Enter contact email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
    
                  <div className="space-y-2">
                    <Label htmlFor="goal" className="pl-1">
                      Fundraising Goal (₹)
                    </Label>
                    <Input
                      id="goal"
                      type="number"
                      placeholder="Enter amount"
                      value={goal}
                      min="1000"
                      onChange={(e) => setGoal(e.target.value)}
                      required
                    />
                  </div>
    
                  <div className="space-y-2">
                    <Label className="pl-1">Campaign Image</Label>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-2">
                        <Input
                          id="imageUrl"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="w-full"
                        />
                      </div>
                      {imageFile && (
                        <div className="flex items-center gap-2">
                          <Button 
                            type="button" 
                            onClick={handleCheckImage}
                            disabled={isCheckingImage}
                            className="w-full"
                          >
                            {isCheckingImage ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Checking Image...
                              </>
                            ) : (
                              "Verify Image Authenticity"
                            )}
                          </Button>
                        </div>
                      )}
                      {imageCheckResult && (
                        <div className={`p-2 rounded-md ${imageCheckResult === "found it" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {imageCheckResult === "found it" 
                            ? "Warning: This image appears to exist on the web." 
                            : imageCheckResult === "not found" 
                              ? "Image appears to be original." 
                              : `Image check result: ${imageCheckResult}`}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">OR</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id="imageUrlLink"
                          type="text"
                          placeholder="Enter Image URL"
                          value={imageUrl}
                          onChange={(e) => setImage(e.target.value)}
                          className="w-full"
                          disabled={imageFile !== null}
                        />
                      </div>
                    </div>
                  </div>
    
                  <div className="space-y-2">
                    <Label htmlFor="certificateFile" className="pl-1">
                      NGO Registration Certificate
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="certificateFile"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleCertificateChange}
                        className="w-full"
                        required
                      />
                    </div>
                    {certificateFile && (
                      <p className="text-sm text-muted-foreground">
                        File selected: {certificateFile.name}
                      </p>
                    )}
                  </div>
    
                  <div className="space-y-2">
                    <Label htmlFor="supportingDocFile" className="pl-1">
                      Other Supporting Document
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="supportingDocFile"
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleSupportingDocChange}
                        className="w-full"
                      />
                    </div>
                    {supportingDocFile && (
                      <p className="text-sm text-muted-foreground">
                        File selected: {supportingDocFile.name}
                      </p>
                    )}
                  </div>
    
                  {isConnected ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Wallet connected: {address?.substring(0, 6)}...{address?.substring(38)}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Please connect your wallet to create a campaign.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
    
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <Card className="p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold text-center">Milestones</h2>
                  <p className="mt-1 text-sm text-muted-foreground text-center">
                    Define how funds will be released
                  </p>
    
                  <div className="mt-6 space-y-4">
                    {milestones.map((milestone, index) => (
                      <div key={index} className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`milestone-${index}-title`}
                            className="pl-1"
                          >
                            Milestone {index + 1} Title
                          </Label>
                          <Input
                            id={`milestone-${index}-title`}
                            placeholder="e.g., Initial Setup"
                            value={milestone.title}
                            onChange={(e) => {
                              const newMilestones = [...milestones];
                              newMilestones[index].title = e.target.value;
                              setMilestones(newMilestones);
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`milestone-${index}-amount`}
                            className="pl-1"
                          >
                            Amount (₹)
                          </Label>
                          <Input
                            id={`milestone-${index}-amount`}
                            type="number"
                            placeholder="Enter amount"
                            value={milestone.amount}
                            min="0"
                            onChange={(e) => {
                              const newMilestones = [...milestones];
                              newMilestones[index].amount = e.target.value;
                              setMilestones(newMilestones);
                            }}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
    
              <Button
              type="submit"
              size="lg"
              className="w-full rounded-lg shadow-md text-lg font-medium transition duration-300 hover:bg-primary/90"
              disabled={Boolean(
                isSubmitting ||
                  !isConnected ||
                  !ngoAllowed ||
                  !ngoRegistrationNumber ||
                  isNgoChecking ||
                  isCheckingImage ||
                  (imageFile && imageCheckResult === "found it")
              )}
      >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Creating Campaign...
        </>
      ) : (
        "Create Campaign"
      )}
    </Button>
            </motion.form>
          </div>
        </main>
      );
    }
    
    