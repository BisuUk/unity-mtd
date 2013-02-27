#pragma strict

/// <summary>
/// Trivial script that fills the label's contents gradually, as if someone was typing.
/// </summary>
@script RequireComponent (UILabel)

var charsPerSecond : int = 70;

var mLabel : UILabel;
var mText : String;
var mOffset : int  = 0;
var mNextChar : float  = 0f;

function Update ()
{
   if (mLabel == null)
   {
      mLabel = GetComponent(UILabel);
      //mLabel.supportEncoding = false;
      mLabel.symbolStyle = UIFont.SymbolStyle.None;
      mText = mLabel.font.WrapText(mLabel.text, mLabel.lineWidth / mLabel.cachedTransform.localScale.x, mLabel.maxLineCount, false, UIFont.SymbolStyle.None);
   }

   if (mOffset < mText.Length)
   {
      if (mNextChar <= Time.realtimeSinceStartup)
      {
         charsPerSecond = Mathf.Max(1, charsPerSecond);
   
         // Periods and end-of-line characters should pause for a longer time.
         var delay : float = 1f / charsPerSecond;
         var c : char = mText[mOffset];
         if (c == '.' || c == '\n' || c == '!' || c == '?') delay *= 4f;
   
         mNextChar = Time.realtimeSinceStartup + delay;
         if (mText.Substring(mOffset, 1)=="[")
         {
            if (mText.Substring(mOffset,2)!="[-")
               mOffset+=8;
            else
               mOffset+=4;
         }
         mLabel.text = mText.Substring(0, ++mOffset);
      }
   }
   else
      Destroy(this);
}