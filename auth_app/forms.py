from django import forms
from django.contrib.auth.models import User

class RegisterForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput)
    password_confirm = forms.CharField(widget=forms.PasswordInput,label="confirm password")

    class Meta:
        model = User
        fields = ["username","password","password_confirm"]

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')

        # check if the password matches
        if password and password_confirm and password != password_confirm:
            raise forms.ValidationError("password do not match")
        return cleaned_data
    


class ContactForm(forms.Form):
    name = forms.CharField(max_length=100, widget=forms.TextInput(attrs={
        'placeholder': 'Your name',
        'required': True
    }))
    email = forms.EmailField(widget=forms.EmailInput(attrs={
        'placeholder': 'Your email',
        'required': True
    }))
    message = forms.CharField(widget=forms.Textarea(attrs={
        'placeholder': 'Your message',
        'required': True,
        'rows': 6
    }))
    
    def clean_message(self):
        message = self.cleaned_data.get('message', '').strip()
        if len(message) < 10:
            raise forms.ValidationError('Please provide a longer message (at least 10 characters).')
        return message

