import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Fitbit | Fluid Calendar",
    description: "Visualiza tus datos de salud y actividad de Fitbit",
};

export default function FitbitLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
