import unittest,tempfile,pathlib,sqlite3
from unittest.mock import patch
import paper_titles as titles

class PaperTitlesTests(unittest.TestCase):
 def test_english_title_translation_only_sends_title(self):
  with patch.object(titles.study,'resolve',return_value=dict(title='An English Paper',summary='Do not translate this',note='Private note')),patch.object(titles.library,'translate_text',return_value='英文论文') as translate:
   result=titles.bilingual_title(dict(paperId='test',title='Injected text'))
   self.assertEqual(result['titleEn'],'An English Paper');self.assertEqual(result['titleZh'],'英文论文')
   translate.assert_called_once_with('An English Paper')
 def test_explicit_bilingual_metadata_needs_no_online_translation(self):
  with patch.object(titles.study,'resolve',return_value=dict(title='Original',titleZh='中文标题',titleEn='Original')),patch.object(titles.library,'translate_text') as translate:
   self.assertEqual(titles.bilingual_title(dict(paperId='test'))['titleZh'],'中文标题');translate.assert_not_called()
 def test_failure_keeps_source_title(self):
  with patch.object(titles.study,'resolve',return_value=dict(title='Original title')),patch.object(titles.library,'translate_text',side_effect=ValueError('offline')):
   result=titles.bilingual_title(dict(paperId='test'));self.assertEqual(result['titleEn'],'Original title');self.assertTrue(result['error'])
 def test_chinese_title_translates_to_english(self):
  with patch.object(titles.study,'resolve',return_value=dict(title='中文论文')),patch.object(titles,'translate_english',return_value='Chinese paper') as translate:
   result=titles.bilingual_title(dict(paperId='test'));self.assertEqual(result['titleZh'],'中文论文');self.assertEqual(result['titleEn'],'Chinese paper');translate.assert_called_once_with('中文论文')
 def test_reverse_translation_uses_directional_cache(self):
  with tempfile.TemporaryDirectory() as folder:
   def connection():
    c=sqlite3.connect(pathlib.Path(folder)/'cache.sqlite');c.execute('CREATE TABLE IF NOT EXISTS translations(hash TEXT PRIMARY KEY,en TEXT,zh TEXT,provider TEXT)');return c
   class Response:
    def raise_for_status(self):pass
    def json(self):return [[['Chinese paper']]]
   with patch.object(titles.library.reader_service,'connection',side_effect=connection),patch('requests.get',return_value=Response()) as request:
    self.assertEqual(titles.translate_english('中文论文'),'Chinese paper');self.assertEqual(titles.translate_english('中文论文'),'Chinese paper');self.assertEqual(request.call_count,1)
if __name__=='__main__':unittest.main()
