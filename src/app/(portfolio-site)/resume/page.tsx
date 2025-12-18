import { Metadata } from 'next';
import { Portfolio } from '@/components/portfolio';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://dipak.tech/resume'
  }
};

export default function Resume(){
    return <Portfolio/>
}
