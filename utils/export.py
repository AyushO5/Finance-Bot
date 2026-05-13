import os
from fpdf import FPDF

def export_chat_to_pdf(messages, title="Chat Export"):
    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(0, 10, title, ln=1, align="C")
    pdf.ln(5)

    # Convert characters safely
    for msg in messages:
        role = "User:" if msg["role"] == "user" else "Advisor:"
        content = msg["content"]
        
        # Replace non-latin1 characters with close approximations to avoid FPDF errors
        content = content.encode('latin-1', 'replace').decode('latin-1')
        
        # Role
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 8, role, ln=1)
        
        # Content
        pdf.set_font("Arial", '', 11)
        pdf.multi_cell(0, 6, content)
        pdf.ln(4)
        
    return pdf.output(dest='S').encode('latin-1')

def export_chat_to_text(messages, title="Chat Export"):
    lines = [f"{title}\n" + "="*len(title) + "\n"]
    for msg in messages:
        role = "User:" if msg["role"] == "user" else "Advisor:"
        lines.append(f"{role}\n{msg['content']}\n")
    return "\n".join(lines)
