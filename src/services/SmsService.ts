import axios from "axios";
import globals from "./globals";

class SMSService {
    public async sendSMS(to: string, message: string): Promise<boolean> {
        try {
            const res = await axios.post<any>(globals.messagingUrl + "/sms", { to, message });
            return res.data?.success;
        }
        catch (err) {
            return false;
        }
    }

    public async sendOtp(phoneNumber: string, channelType: string = 'sms'): Promise<boolean> {
        try {
            const res = await axios.post<any>(globals.messagingUrl + "/otp/send", { phoneNumber, channelType });
            return res.data?.success;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    public async verifyOtp(phoneNumber: string, otp: string): Promise<boolean> {
        try {
            const res = await axios.post<any>(globals.messagingUrl + "/otp/verify", { phoneNumber, otp });
            return res.data?.success;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}
const smsService = new SMSService();
export default smsService;